# Publish this app from a GitHub repository

This setup is for this Vite + React app. It works with different GitHub repository names as long as the app files are at the repository root and the default branch is `main`.

## Files to include

- The app files, including `package.json`, `pnpm-lock.yaml`, `index.html`, `src/`, and `vite.config.ts`, at the repository root.
- `.github/workflows/pages.yml` from this project.

If copying files from another local project folder, do not copy its hidden `.git` folder into the cloned repository.

## Turn on publishing

1. Commit and push the files to the GitHub repository's `main` branch.
2. In the repository, open **Settings → Pages** and choose **GitHub Actions** as the source.
3. Open **Actions** and wait for **Deploy Vite app to GitHub Pages** to finish successfully.
4. GitHub shows the published site URL in the completed deployment. For a user or organization repository, the URL is generally `https://OWNER.github.io/REPOSITORY/`.

The Vite config reads the repository name in GitHub Actions and sets the correct site path automatically. This workflow is for GitHub Pages; other Git hosting providers use different deployment configuration.
