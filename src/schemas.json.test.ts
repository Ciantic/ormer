import * as v from "npm:valibot";
import { assertEquals } from "jsr:@std/assert";
import { SCHEMAS } from "./schemas.ts";

Deno.test("int32", () => {
    const int32 = SCHEMAS.int32();
    assertEquals(v.parse(int32.fromJson, 123), 123);
    assertEquals(v.parse(int32.toJson, 123), 123);
});

Deno.test("int64", () => {
    const int64 = SCHEMAS.int64();

    assertEquals(v.parse(int64.fromJson, 123), 123);
    assertEquals(v.parse(int64.toJson, 123), 123);
});

Deno.test("bigint", () => {
    const bigint = SCHEMAS.bigint();
    // from: Allows numbers and strings
    assertEquals(v.parse(bigint.fromJson, "12345"), 12345n);
    assertEquals(v.parse(bigint.fromJson, 12345), 12345n);

    // to: Small numbers are converted to numbers, big numbers are converted
    // to strings
    assertEquals(v.parse(bigint.toJson, 12345n), 12345);
    assertEquals(v.parse(bigint.toJson, 999999999999999999999n), "999999999999999999999");
});

Deno.test("float32", () => {
    const float32 = SCHEMAS.float32();
    assertEquals(v.parse(float32.fromJson, 123.5), 123.5);
    assertEquals(v.parse(float32.toJson, 123.5), 123.5);
});

Deno.test("float64", () => {
    const float64 = SCHEMAS.float64();
    assertEquals(v.parse(float64.fromJson, 123.5), 123.5);
});

Deno.test("decimal", () => {
    const decimal = SCHEMAS.decimal({
        precision: 5,
        scale: 3,
    });
    assertEquals(v.parse(decimal.fromJson, "12345.123"), "12345.123");
    assertEquals(v.parse(decimal.fromJson, 12345.123), "12345.123");
    assertEquals(v.parse(decimal.toJson, "12345.123"), "12345.123");
});

Deno.test("uuid", () => {
    const uuid = SCHEMAS.uuid();
    assertEquals(
        v.parse(uuid.fromJson, "2703b08e-d93c-4fd0-8aca-30a9f22d4d79"),
        "2703b08e-d93c-4fd0-8aca-30a9f22d4d79"
    );
    assertEquals(
        v.parse(uuid.toJson, "2703b08e-d93c-4fd0-8aca-30a9f22d4d79"),
        "2703b08e-d93c-4fd0-8aca-30a9f22d4d79"
    );
});

Deno.test("string", () => {
    const string = SCHEMAS.string();
    assertEquals(v.parse(string.fromJson, "hello"), "hello");
    assertEquals(v.parse(string.toJson, "hello"), "hello");
});

Deno.test("varchar", () => {
    const varchar = SCHEMAS.varchar({
        maxLength: 5,
    });
    assertEquals(v.parse(varchar.fromJson, "hello"), "hello");
    assertEquals(v.parse(varchar.toJson, "hello"), "hello");
});

Deno.test("boolean", () => {
    const boolean = SCHEMAS.boolean();
    assertEquals(v.parse(boolean.fromJson, true), true);
    assertEquals(v.parse(boolean.toJson, true), true);
});

Deno.test("timestamp", () => {
    const timestamp = SCHEMAS.timestamp({});

    // From JSON
    assertEquals(v.parse(timestamp.fromJson, "2025-02-28T12:00"), new Date("2025-02-28T12:00:00Z"));

    assertEquals(
        v.parse(timestamp.fromJson, "2025-02-28T12:00:00Z"),
        new Date("2025-02-28T12:00:00Z")
    );

    assertEquals(
        v.parse(timestamp.fromJson, "2025-02-28T11:00:00.123-01:00"),
        new Date("2025-02-28T12:00:00.123Z")
    );

    // Accept unix timestamp in seconds or milliseconds
    assertEquals(v.parse(timestamp.fromJson, 1740744000), new Date("2025-02-28T12:00:00Z"));
    assertEquals(v.parse(timestamp.fromJson, 1740744000000), new Date("2025-02-28T12:00:00Z"));

    // To JSON
    assertEquals(
        v.parse(timestamp.toJson, new Date("2025-02-28T12:00:00Z")),
        "2025-02-28T12:00:00.000Z"
    );
});

Deno.test("timestamptz", () => {
    const timestamptz = SCHEMAS.timestamptz({});
    const timestamp = SCHEMAS.timestamp({});

    assertEquals(timestamptz.fromJson.expects, timestamp.fromJson.expects);
    assertEquals(timestamptz.toJson.expects, timestamp.toJson.expects);

    /*
    // From JSON
    assertEquals(
        v.parse(timestamp.fromJson, "2025-02-28T11:00:00.123[-01:00]"),
        Temporal.ZonedDateTime.fromJson("2025-02-28T11:00:00.123[-01:00]")
    );
    assertEquals(
        v.parse(timestamp.fromJson, "2025-02-28T11:00:00.123+02:00[Europe/Helsinki]"),
        Temporal.ZonedDateTime.fromJson("2025-02-28T11:00:00.123+02:00[Europe/Helsinki]")
    );

    // To JSON
    assertEquals(
        v.parse(
            timestamp.toJson,
            Temporal.ZonedDateTime.fromJson("2025-02-28T11:00:00.123[Europe/Helsinki]")
        ),
        "2025-02-28T11:00:00.123+02:00[Europe/Helsinki]"
    );
    */
});

Deno.test("datepart", () => {
    const timestamp = SCHEMAS.datepart();

    // From JSON
    assertEquals(v.parse(timestamp.fromJson, "2025-02-28"), "2025-02-28");
    // assertThrows(() => v.parse(timestamp.fromJson, "2023-06-31"));

    // To JSON
    assertEquals(v.parse(timestamp.toJson, "2025-02-28"), "2025-02-28");
});

Deno.test("timepart", () => {
    const timestamp = SCHEMAS.timepart();

    assertEquals(v.parse(timestamp.fromJson, "23:59"), "23:59");
    assertEquals(v.parse(timestamp.fromJson, "23:59:12"), "23:59:12");
    assertEquals(v.parse(timestamp.fromJson, "23:59:12.1234"), "23:59:12.1234");
    // assertThrows(() => v.parse(timestamp.fromJson, "invalid-time"));
    // assertThrows(() => v.parse(timestamp.fromJson, "25:00"));

    // To JSON
    assertEquals(v.parse(timestamp.toJson, "12:00"), "12:00");
    assertEquals(v.parse(timestamp.toJson, "23:59:12.1234"), "23:59:12.1234");
});
