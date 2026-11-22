#[tokio::main(flavor = "current_thread")]
async fn main() {
    if let Err(error) = phobos_world_pyecho_life_runtime::run_spawned_interface_life(
        phobos_realtime_signaling::interface_life(),
    )
    .await
    {
        eprintln!("phobos-realtime-signaling-life failed: {error}");
        std::process::exit(1);
    }
}
