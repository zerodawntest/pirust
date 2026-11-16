{ pkgs, lib, ... }:
{
  languages.rust = {
    enable = true;
    channel = "stable";
    version = "1.100.0";
    components = [ "rustc" "cargo" "clippy" "rustfmt" "rust-analyzer" ];
  };

  packages = with pkgs; [ gh jq nodejs gitleaks bubblewrap ];

  # central core.hooksPath calls .githooks/pre-commit; skip devenv install
  tasks."devenv:git-hooks:install".exec = lib.mkForce "true";
  git-hooks.hooks = {
    rustfmt.enable = true;
    clippy = { enable = true; settings.denyWarnings = true; };
    gitleaks.enable = true;
    check-merge-conflicts.enable = true;
    shellcheck.enable = true;
  };
}
