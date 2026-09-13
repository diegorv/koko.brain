mod debug_test;
mod files_test;
// Desktop-only: the updater command is compiled behind `desktop_integration`.
#[cfg(desktop_integration)]
mod update_channel_test;
mod vault_test;
