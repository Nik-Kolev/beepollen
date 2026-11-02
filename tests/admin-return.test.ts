import assert from "node:assert/strict";
import { test } from "node:test";

import { adminLoginPath, adminReturnPath } from "@/lib/admin-return";

test("an admin page and its query survive as the return path", () => {
  assert.equal(adminReturnPath("/admin/todo"), "/admin/todo");
  assert.equal(adminReturnPath("/admin"), "/admin");
  assert.equal(
    adminReturnPath("/admin/orders?status=NEW"),
    "/admin/orders?status=NEW",
  );
  assert.equal(
    adminReturnPath("/admin/%2F%2Fevil.example"),
    "/admin/%2F%2Fevil.example",
  );
  assert.equal(adminReturnPath("/admin/login-history"), "/admin/login-history");
});

test("anything outside the admin falls back to /admin", () => {
  for (const value of [
    "https://evil.example/admin/todo",
    "//evil.example/admin/todo",
    "/\\evil.example/admin",
    "/products/pchelen-prashets-500g",
    "/administrator",
    "admin/todo",
    "/admin/login",
    "/admin/login?next=/admin/todo",
    "/admin/../products",
    "/admin/%2e%2e/products",
    "/\t/evil.example/admin",
    "/\n/evil.example/admin",
    "",
    null,
    undefined,
  ]) {
    assert.equal(adminReturnPath(value), "/admin", String(value));
  }
});

test("a file sent as the field falls back to /admin", () => {
  assert.equal(adminReturnPath(new File(["/admin/todo"], "x")), "/admin");
});

test("the login path carries the page encoded", () => {
  assert.equal(
    adminLoginPath("/admin/todo"),
    "/admin/login?next=%2Fadmin%2Ftodo",
  );
});
