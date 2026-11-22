#[tokio::main]
async fn main() {
    if let Err(error) = phobos_system_coder_env::run_coder_fs_tool_process().await {
        eprintln!("{error}");
        std::process::exit(1);
    }
}
