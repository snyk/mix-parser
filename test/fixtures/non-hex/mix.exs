defmodule NonHex.MixProject do
  use Mix.Project

  def project do
    [
      app: :nonhex,
      version: "0.0.1",
      elixir: "~> 1.9",
      start_permanent: Mix.env() == :prod,
      deps: deps()
    ]
  end

  def application do
    []
  end

  defp deps do
    [
      {:umbrella_pkg, in_umbrella: true},
      {:path_pkg, path: "../some_path"},
      {:git_pkg, git: "https://github.com/elixir-lang/gettext.git", tag: "0.1", ref: "ref1", branch: "branch1", submodules: "submodules1", sparse: "sparse1"},
      {:github_pkg, github: "org/repo", tag: "0.2", ref: "ref2", branch: "branch2", submodules: "submodules2", sparse: "sparse2"},
    ]
  end
end
