use std::sync::Arc;

use phobos_interface_transport::{InterfaceLifeFuture, InterfaceLiftFn};

#[tokio::main(flavor = "current_thread")]
async fn main() {
    let life: InterfaceLiftFn = Arc::new(|ctx| {
        Box::pin(
            phobos_world_pyecho_life_runtime::run_descriptor_activation_life(
                ctx,
                phobos_interface_activation_stdin_json_lines::TRANSPORT_REF,
                phobos_interface_activation_stdin_json_lines::activation_start,
            ),
        ) as InterfaceLifeFuture
    });
    if let Err(error) = phobos_world_pyecho_life_runtime::run_spawned_interface_life(life).await {
        eprintln!("phobos-stdin-json-lines-life failed: {error}");
        std::process::exit(1);
    }
}
