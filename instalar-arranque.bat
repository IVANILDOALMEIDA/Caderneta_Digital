@echo off
set "D=%~dp0"
> "%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\Caderneta.vbs" echo CreateObject("WScript.Shell").Run "cmd /c cd /d ""%D%"" ^&^& node server.js",0,False
echo Pronto! A Caderneta vai arrancar sozinha quando o Windows iniciar.
pause
