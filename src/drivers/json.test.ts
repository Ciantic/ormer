import "npm:temporal-polyfill/global";

import * as v from "npm:valibot";
import { assertEquals, assertThrows } from "jsr:@std/assert";
import { JSON_SCHEMAS } from "./json.ts";

Deno.test("int32", () => {
    const int32 = JSON_SCHEMAS.int32();
    assertEquals(v.parse(int32.from, 123), 123);
    assertEquals(v.parse(int32.to, 123), 123);
});

Deno.test("int64", () => {
    const int64 = JSON_SCHEMAS.int64();

    assertEquals(v.parse(int64.from, 123), 123);
    assertEquals(v.parse(int64.to, 123), 123);
});

Deno.test("bigint", () => {
    const bigint = JSON_SCHEMAS.bigint();
    // from: Allows numbers and strings
    assertEquals(v.parse(bigint.from, "12345"), 12345n);
    assertEquals(v.parse(bigint.from, 12345), 12345n);

    // to: Small numbers are converted to numbers, big numbers are converted
    // to strings
    assertEquals(v.parse(bigint.to, 12345n), 12345);
    assertEquals(v.parse(bigint.to, 999999999999999999999n), "999999999999999999999");
});

Deno.test("float32", () => {
    const float32 = JSON_SCHEMAS.float32();
    assertEquals(v.parse(float32.from, 123.5), 123.5);
    assertEquals(v.parse(float32.to, 123.5), 123.5);
});

Deno.test("float64", () => {
    const float64 = JSON_SCHEMAS.float64();
    assertEquals(v.parse(float64.from, 123.5), 123.5);
});

Deno.test("decimal", () => {
    const decimal = JSON_SCHEMAS.decimal();
    assertEquals(v.parse(decimal.from, "12345.123"), "12345.123");
    assertEquals(v.parse(decimal.from, 12345.123), "12345.123");
    assertEquals(v.parse(decimal.to, "12345.123"), "12345.123");
});

Deno.test("uuid", () => {
    const uuid = JSON_SCHEMAS.uuid();
    assertEquals(
        v.parse(uuid.from, "2703b08e-d93c-4fd0-8aca-30a9f22d4d79"),
        "2703b08e-d93c-4fd0-8aca-30a9f22d4d79"
    );
    assertEquals(
        v.parse(uuid.to, "2703b08e-d93c-4fd0-8aca-30a9f22d4d79"),
        "2703b08e-d93c-4fd0-8aca-30a9f22d4d79"
    );
});

Deno.test("string", () => {
    const string = JSON_SCHEMAS.string();
    assertEquals(v.parse(string.from, "hello"), "hello");
    assertEquals(v.parse(string.to, "hello"), "hello");
});

Deno.test("varchar", () => {
    const varchar = JSON_SCHEMAS.varchar();
    assertEquals(v.parse(varchar.from, "hello"), "hello");
    assertEquals(v.parse(varchar.to, "hello"), "hello");
});

Deno.test("boolean", () => {
    const boolean = JSON_SCHEMAS.boolean();
    assertEquals(v.parse(boolean.from, true), true);
    assertEquals(v.parse(boolean.to, true), true);
});

Deno.test("timestamp", () => {
    const timestamp = JSON_SCHEMAS.timestamp();

    // From JSON
    assertEquals(v.parse(timestamp.from, "2025-02-28T12:00"), new Date("2025-02-28T12:00:00Z"));

    assertEquals(v.parse(timestamp.from, "2025-02-28T12:00:00Z"), new Date("2025-02-28T12:00:00Z"));

    assertEquals(
        v.parse(timestamp.from, "2025-02-28T11:00:00.123-01:00"),
        new Date("2025-02-28T12:00:00.123Z")
    );

    // Accept unix timestamp in seconds or milliseconds
    assertEquals(v.parse(timestamp.from, 1740744000), new Date("2025-02-28T12:00:00Z"));
    assertEquals(v.parse(timestamp.from, 1740744000000), new Date("2025-02-28T12:00:00Z"));

    // To JSON
    assertEquals(
        v.parse(timestamp.to, new Date("2025-02-28T12:00:00Z")),
        "2025-02-28T12:00:00.000Z"
    );
});

Deno.test("timestamptz", () => {
    const timestamptz = JSON_SCHEMAS.timestamptz();
    const timestamp = JSON_SCHEMAS.timestamp();

    assertEquals(timestamptz.from.expects, timestamp.from.expects);
    assertEquals(timestamptz.to.expects, timestamp.to.expects);

    /*
    // From JSON
    assertEquals(
        v.parse(timestamp.from, "2025-02-28T11:00:00.123[-01:00]"),
        Temporal.ZonedDateTime.from("2025-02-28T11:00:00.123[-01:00]")
    );
    assertEquals(
        v.parse(timestamp.from, "2025-02-28T11:00:00.123+02:00[Europe/Helsinki]"),
        Temporal.ZonedDateTime.from("2025-02-28T11:00:00.123+02:00[Europe/Helsinki]")
    );

    // To JSON
    assertEquals(
        v.parse(
            timestamp.to,
            Temporal.ZonedDateTime.from("2025-02-28T11:00:00.123[Europe/Helsinki]")
        ),
        "2025-02-28T11:00:00.123+02:00[Europe/Helsinki]"
    );
    */
});

Deno.test("datepart", () => {
    const timestamp = JSON_SCHEMAS.datepart();

    // From JSON
    assertEquals(v.parse(timestamp.from, "2025-02-28"), "2025-02-28");
    // assertThrows(() => v.parse(timestamp.from, "2023-06-31"));

    // To JSON
    assertEquals(v.parse(timestamp.to, "2025-02-28"), "2025-02-28");
});

Deno.test("timepart", () => {
    const timestamp = JSON_SCHEMAS.timepart();

    assertEquals(v.parse(timestamp.from, "23:59"), "23:59");
    assertEquals(v.parse(timestamp.from, "23:59:12"), "23:59:12");
    assertEquals(v.parse(timestamp.from, "23:59:12.1234"), "23:59:12.1234");
    // assertThrows(() => v.parse(timestamp.from, "invalid-time"));
    // assertThrows(() => v.parse(timestamp.from, "25:00"));

    // To JSON
    assertEquals(v.parse(timestamp.to, "12:00"), "12:00");
    assertEquals(v.parse(timestamp.to, "23:59:12.1234"), "23:59:12.1234");
});
