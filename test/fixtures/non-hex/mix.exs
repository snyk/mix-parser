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
      {:git_tag, git: "https://github.com/elixir-lang/gettext.git", tag: "0.1"},
      {:git_ref, git: "https://github.com/elixir-lang/gettext.git", ref: "ref1"},
      {:git_branch, git: "https://github.com/elixir-lang/gettext.git", branch: "branch1"},
      {:git_submodules, git: "https://github.com/elixir-lang/gettext.git", submodules: "submodules1"},
      {:git_sparse, git: "https://github.com/elixir-lang/gettext.git", sparse: "sparse1"},
      {:git_none, git: "https://github.com/elixir-lang/gettext.git"},
      {:github_tag, github: "org/repo", tag: "0.1"},
      {:github_ref, github: "org/repo", ref: "ref1"},
      {:github_branch, github: "org/repo", branch: "branch1"},
      {:github_submodules, github: "org/repo", submodules: "submodules1"},
      {:github_sparse, github: "org/repo", sparse: "sparse1"},
      {:github_none, github: "org/repo"},
    ]
  end
end
