#[tokio::main(flavor = "current_thread")]
async fn main() {
    let result = match phobos_provider_codex::doctor_requested() {
        Ok(true) => phobos_provider_codex::doctor_native_interface(),
        Ok(false) => {
            phobos_world_pyecho_life_runtime::run_spawned_interface_life(
                phobos_provider_codex::interface_life(),
            )
            .await
        }
        Err(error) => Err(error),
    };
    if let Err(error) = result {
        eprintln!("phobos-provider-codex-life failed: {error}");
        std::process::exit(1);
    }
}
