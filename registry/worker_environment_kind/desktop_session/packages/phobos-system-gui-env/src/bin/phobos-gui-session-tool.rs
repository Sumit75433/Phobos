#[tokio::main]
async fn main() {
    if let Err(error) = phobos_system_gui_env::run_gui_session_tool_process().await {
        eprintln!("{error}");
        std::process::exit(1);
    }
}
