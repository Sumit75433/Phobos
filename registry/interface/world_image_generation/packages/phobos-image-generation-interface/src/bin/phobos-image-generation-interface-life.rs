#[tokio::main]
async fn main() {
    if let Err(error) = phobos_world_pyecho_life_runtime::run_spawned_interface_life(
        phobos_image_generation_interface::interface_life(),
    )
    .await
    {
        eprintln!("phobos-image-generation-interface-life failed: {error}");
        std::process::exit(1);
    }
}
