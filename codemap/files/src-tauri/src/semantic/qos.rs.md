# file card src-tauri/src/semantic/qos.rs
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src-tauri/src/semantic/qos.rs ' codemap/files
file src-tauri/src/semantic/qos.rs rust L148 module src-tauri/src/semantic in1 t2 | macOS quality-of-service (QoS) for the embedder's threads.
## imports
imp src-tauri/src/semantic/qos.rs:23 -> src-tauri/src/utils/logger.rs debug_log
## imported-by
imp src-tauri/src/commands/semantic.rs:8 -> src-tauri/src/semantic/qos.rs enter_utility_qos
## reach
in2 src-tauri/src/semantic/qos.rs 2 files in 2 modules: src-tauri/src(1) src-tauri/src/commands(1)
out2 src-tauri/src/semantic/qos.rs 0 files in 0 modules: -
## tests
test src-tauri/tests/semantic_embedder_qos_session_test.rs imports src-tauri/src/semantic/qos.rs
test src-tauri/tests/semantic_qos_test.rs imports src-tauri/src/semantic/qos.rs
## symbols
sym src-tauri/src/semantic/qos.rs:26 const QOS_CLASS_UTILITY L1 | `QOS_CLASS_UTILITY` from `<sys/qos.h>`.
sym src-tauri/src/semantic/qos.rs:34 fn utility_workers_started() -> usize L3 | Returns how many ORT worker threads [`UtilityQosThreadManager`] has started at utility QoS since process start (always 0 off macOS).
sym src-tauri/src/semantic/qos.rs:50 fn current_qos_class() -> Option<u32> L11 | Returns the current thread's QoS class, or `None` off macOS.
sym src-tauri/src/semantic/qos.rs:76 struct UtilityQosGuard L7 | Restores the thread's previous QoS class when dropped.
sym src-tauri/src/semantic/qos.rs:89 fn enter_utility_qos() -> UtilityQosGuard L16 | Lowers the current thread to utility QoS until the returned guard drops.
by src-tauri/src/semantic/qos.rs:enter_utility_qos <- src-tauri/src/commands/semantic.rs:388 in init_semantic_search lexical +4
sym src-tauri/src/semantic/qos.rs:124 struct UtilityQosThreadManager L1 | ORT thread manager that starts each worker thread at utility QoS.
## locals
local src-tauri/src/semantic/qos.rs:64 fn set_current_qos_class(qos_class: u32) -> bool L5
local src-tauri/src/semantic/qos.rs:107 fn UtilityQosGuard::drop(&mut self) L10
local src-tauri/src/semantic/qos.rs:129 fn UtilityQosThreadManager::create(&self, work: impl FnOnce() + Send + 'static) -> ort::Result<Self::Thread> L13
local src-tauri/src/semantic/qos.rs:143 fn UtilityQosThreadManager::join(thread: Self::Thread) -> ort::Result<()> L5
## calls
call src-tauri/src/semantic/qos.rs:92 in enter_utility_qos -> src-tauri/src/semantic/qos.rs:current_qos_class call
call src-tauri/src/semantic/qos.rs:93 in enter_utility_qos -> src-tauri/src/semantic/qos.rs:set_current_qos_class call
call src-tauri/src/semantic/qos.rs:112 in UtilityQosGuard::drop -> src-tauri/src/semantic/qos.rs:set_current_qos_class call
call src-tauri/src/semantic/qos.rs:113 in UtilityQosGuard::drop -> src-tauri/src/utils/logger.rs:debug_log lexical
call src-tauri/src/semantic/qos.rs:134 in UtilityQosThreadManager::create -> src-tauri/src/semantic/qos.rs:enter_utility_qos call
call src-tauri/src/semantic/qos.rs:135 in UtilityQosThreadManager::create -> src-tauri/src/semantic/qos.rs:current_qos_class call
