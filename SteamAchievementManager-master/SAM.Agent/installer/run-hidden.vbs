' Achivo Agent — launches SAM.Agent.exe with NO visible console window.
' The autostart shortcut points here so the agent runs silently in the
' background. The exe still listens on http://127.0.0.1:57343 as usual.
Dim fso, here, exe, sh
Set fso = CreateObject("Scripting.FileSystemObject")
here = fso.GetParentFolderName(WScript.ScriptFullName)
exe = here & "\SAM.Agent.exe"
Set sh = CreateObject("WScript.Shell")
' 0 = hidden window, False = don't wait for it to exit.
sh.Run """" & exe & """", 0, False
