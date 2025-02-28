import * as v from "npm:valibot";
import { assertEquals, assertThrows } from "jsr:@std/assert";
import { SCHEMAS } from "./schemas.ts";

Deno.test("int32", () => {
    const schema = SCHEMAS.int32();
    assertEquals(v.parse(schema, 123), 123);

    assertThrows(() => v.parse(schema, 123.5), "Decimals not allowed");
    assertThrows(() => v.parse(schema, 2147483648), "Number too large");
    assertThrows(() => v.parse(schema, -2147483649), "Number too small");
    assertThrows(() => v.parse(schema, "12345"), "Expected number");
});

Deno.test("int64", () => {
    const schema = SCHEMAS.int64();

    assertEquals(v.parse(schema, 123), 123);

    assertThrows(() => v.parse(schema, 123.5), "Decimals not allowed");
    assertThrows(() => v.parse(schema, Number.MAX_SAFE_INTEGER + 1), "Number too large");
    assertThrows(() => v.parse(schema, Number.MIN_SAFE_INTEGER - 1), "Number too small");
    assertThrows(() => v.parse(schema, "12345"), "Expected number");
});

Deno.test("bigint", () => {
    const schema = SCHEMAS.bigint();

    // Normal schema is just bigint
    assertEquals(v.parse(schema, 12345n), 12345n);

    assertThrows(() => v.parse(schema, 123.5), "Decimals not allowed");
    assertThrows(() => v.parse(schema, Infinity), "Number too large");
    assertThrows(() => v.parse(schema, -Infinity), "Number too small");
    assertThrows(() => v.parse(schema, "not_a_number"), "Expected number");
});

Deno.test("float32", () => {
    const schema = SCHEMAS.float32();
    assertEquals(v.parse(schema, 123.5), 123.5);

    assertThrows(() => v.parse(schema, Infinity), "Number too large");
    assertThrows(() => v.parse(schema, -Infinity), "Number too small");
    assertThrows(() => v.parse(schema, "1.23"), "Expected number");
});

Deno.test("float64", () => {
    const schema = SCHEMAS.float64();
    assertEquals(v.parse(schema, 123.5), 123.5);

    assertThrows(() => v.parse(schema, Infinity), "Number too large");
    assertThrows(() => v.parse(schema, -Infinity), "Number too small");
    assertThrows(() => v.parse(schema, "1.23"), "Expected number");
});

Deno.test("decimal", () => {
    const schema = SCHEMAS.decimal({
        precision: 5,
        scale: 3,
    });
    assertEquals(v.parse(schema, "12345.123"), "12345.123");

    assertThrows(() => v.parse(schema, Infinity), "Number too large");
    assertThrows(() => v.parse(schema, -Infinity), "Number too small");
    assertThrows(() => v.parse(schema, "not_a_number"), "Invalid decimal");
    assertThrows(() => v.parse(schema, "123456.123"), "Length too large");
    assertThrows(() => v.parse(schema, "12345.1234"), "Length too large");

    // TODO: Maybe allow?
    assertThrows(() => v.parse(schema, 1234.123), "Expected string");
});

Deno.test("uuid", () => {
    const schema = SCHEMAS.uuid();
    assertEquals(
        v.parse(schema, "2703b08e-d93c-4fd0-8aca-30a9f22d4d79"),
        "2703b08e-d93c-4fd0-8aca-30a9f22d4d79"
    );

    assertThrows(() => v.parse(schema, "not_a_uuid"), "Invalid UUID");
    assertThrows(() => v.parse(schema, 123), "Expected string");
    assertThrows(() => v.parse(schema, 123n), "Expected string");
});

Deno.test("string", () => {
    const schema = SCHEMAS.string();
    assertEquals(v.parse(schema, "hello"), "hello");

    assertThrows(() => v.parse(schema, 123), "Expected string");
});

Deno.test("varchar", () => {
    const schema = SCHEMAS.varchar({
        maxLength: 5,
    });
    assertEquals(v.parse(schema, "hello"), "hello");

    assertThrows(() => v.parse(schema, "123456"), "Length too large");
    assertThrows(() => v.parse(schema, 123), "Expected string");
});

Deno.test("boolean", () => {
    const schema = SCHEMAS.boolean();
    assertEquals(v.parse(schema, true), true);

    assertThrows(() => v.parse(schema, 123), "Expected boolean");
    assertThrows(() => v.parse(schema, "true"), "Expected boolean");
});
