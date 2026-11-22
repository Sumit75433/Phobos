#[tokio::main(flavor = "current_thread")]
async fn main() {
    if let Err(error) = phobos_system_workspace_env::run_workspace_exec_tool_process().await {
        eprintln!("phobos-workspace-exec-tool failed: {error}");
        std::process::exit(1);
    }
}
