@echo off

rem
rem  Set maximum memory for JVM heap
rem
set "JAVA_OPTS= -Xmx2048m"

rem
rem  Set JAVA_HOME to bundled JDK
rem
set "INSTALL_DIR=%~dp0%"
set "JAVA_HOME=%INSTALL_DIR%jdk-17.0.15+6"

set "JAVA_OPTS=%JAVA_OPTS%"
set "CLASSPATH=%INSTALL_DIR%/bin/p2rank.jar;%INSTALL_DIR%/bin/lib/*"

"%JAVA_HOME%\bin\java.exe" %JAVA_OPTS% -cp "%CLASSPATH%" cz.siret.prank.program.Main %*