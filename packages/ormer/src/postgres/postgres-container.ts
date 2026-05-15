import { exec } from "node:child_process";
import { promisify } from "node:util";

const asyncExec = promisify(exec);

const CONTAINER_NAME = "ormer-pg-test";

export async function startContainer() {
  try {
    await asyncExec(
      `podman run --rm -d --name ${CONTAINER_NAME} -e POSTGRES_PASSWORD=test -e POSTGRES_DB=test -p 5432:5432 --timeout 120 docker.io/library/postgres:17`,
    );
  } catch {
    // container already running, ignore
  }
}

export async function stopContainer() {
  try {
    await asyncExec(`podman rm -f ${CONTAINER_NAME}`);
  } catch {
    // ignore
  }
}
