# push.ps1 — 在 Windows 上一键把 iOShabit 推送到 GitHub（触发云端编译）
#
# 用法：
#   1. 去 https://github.com/new 新建一个【空】仓库（不要勾选 README / .gitignore / License），
#      建好后复制仓库地址，类似 https://github.com/你的用户名/iOShabit.git
#   2. 把下面 $REMOTE 改成你的地址
#   3. 在本目录右键「使用 PowerShell 运行」即可
#
# 注意：本脚本只做本地 -> 远程的推送，不会执行任何危险操作。

$REMOTE = "https://github.com/ply7745/ai.git"   # <-- 你的仓库地址

Set-Location $PSScriptRoot

# 若地址还是占位符，提示后退出
if ($REMOTE -like "*你的用户名*") {
    Write-Host "请先编辑本脚本顶部的 `$REMOTE 为你真实的 GitHub 仓库地址，再运行。" -ForegroundColor Yellow
    exit 1
}

git branch -M main
git remote remove origin 2>$null
git remote add origin $REMOTE
git push -u origin main

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ 推送成功！请打开 GitHub 仓库 -> Actions 页面查看云端编译，下载产物 MyiOShabit-unsigned (IPA)。" -ForegroundColor Green
} else {
    Write-Host "❌ 推送失败，请检查仓库地址是否正确、网络是否可访问 GitHub。" -ForegroundColor Red
}
