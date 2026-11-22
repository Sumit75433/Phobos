#[tokio::main(flavor = "current_thread")]
async fn main() {
    if let Err(error) = phobos_world_pyecho_life_runtime::run_spawned_interface_life(
        phobos_mcp_client::operation_interface_life(),
    )
    .await
    {
        eprintln!("phobos-mcp-operation-life failed: {error}");
        std::process::exit(1);
    }
}
