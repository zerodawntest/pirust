# Inventory: packages/env (pi `@earendil-works/pi-env`)

Format: `path | exports | purpose | target crate`. Source root: `/src/pi/packages/env`.
Depends on nothing from pi at runtime; has a Rust daemon already (`daemon/`, cargo) — reuse it.

src/connection.ts | `Json`, `RemoteError`, `RemoteInfo`, `nodePlatform`, `ConnectionOptions`, `Reply`, `RequestOptions`, `isConnectionLost` , `Connection` | Request/reply channel to remote daemon | pi-env
src/errors.ts | `abortResult`, `toFileError` | Maps fs/abort errors to `FileError` result | pi-env
src/list-files.ts | `listFilesOver`, `LocalExecutionEnvOptions`, `LocalExecutionEnv` | Local env: list files, local exec | pi-env
src/process.ts | `ProcessOptions`, `RemoteProcess`, `openProcess` | Spawn/stream remote process output | pi-env
src/remote-env.ts | `RemoteExecutionEnvOptions`, `remotePath`, `RemoteExecutionEnv`, `RemoteInfo`(re-export) | Remote fs+exec env over daemon | pi-env
src/ssh.ts | `RemotePlatform`, `SshTarget`, `HostKeyUnknownError`, `HostKeyChangedError`, `SshError`, `sshArguments`, `scanHostKey`, `acceptHostKey`, `forgetHostKey`, `detectPlatform`, `packagedDaemon`, `localDaemon`, `deployDaemon`, `SshConnectOptions`, `sshConnection`, `connectSsh` | SSH args, host keys, deploy daemon | pi-env
src/terminal.ts | `TerminalOptions`, `TerminalForeground`, `RemoteTerminal`, `openTerminal` | Interactive remote terminal session | pi-env
src/watch.ts | `RemoteWatchOptions`, `RemoteWatcher` | Watch remote files for changes | pi-env
src/index.ts | re-exports all of the above (named re-exports only) | Public API surface of the package | pi-env (lib root)
test/daemon.ts | `daemon` | Test daemon binary handle | pi-env (tests)
test/build-daemon.ts | `setup` | Builds the Rust daemon before tests | pi-env (tests)
test/old-daemon.ts | `daemon` (old version) | Old daemon for compatibility tests | pi-env (tests)
test/connection.test.ts | — | Tests request/reply channel | pi-env (tests)
test/conformance.test.ts | — | Checks env impls against spec suite | pi-env (tests)
test/differential.test.ts | — | Diffs local vs remote env behaviour | pi-env (tests)
test/process.test.ts | — | Tests remote process spawn/stream | pi-env (tests)
test/remote.test.ts | — | Tests remote fs+exec env | pi-env (tests)
test/remote-abort.test.ts | — | Tests abort/cancel on remote env | pi-env (tests)
test/ssh.test.ts | — | Tests ssh args, host keys, deploy | pi-env (tests)
test/ssh-external.test.ts | — | Tests ssh against real remote host | pi-env (tests, network-gated)
test/terminal.test.ts | — | Tests remote terminal sessions | pi-env (tests)
vitest.config.ts | default (vitest config) | Test runner config, not ported | none
