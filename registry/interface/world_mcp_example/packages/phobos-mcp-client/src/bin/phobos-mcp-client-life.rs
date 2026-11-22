#[tokio::main(flavor = "current_thread")]
async fn main() {
    if let Err(error) = phobos_world_pyecho_life_runtime::run_spawned_interface_life(
        phobos_mcp_client::catalog_interface_life(),
    )
    .await
    {
        eprintln!("phobos-mcp-client-life failed: {error}");
        std::process::exit(1);
    }
}
