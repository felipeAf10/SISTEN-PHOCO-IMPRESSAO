@echo off
color 0B
cls
echo ==============================================================================
echo                 DIAGNOSTICO DE DEPLOY (FORCAR ATUALIZACAO)
echo ==============================================================================
echo.
echo     Esta ferramenta vai tentar enviar o site e GRAVAR o erro se houver.
echo     Por favor, aguarde ate a janela fechar sozinha ou pedir para fechar.
echo.
echo     [INICIANDO]...
echo.

(
  echo STARTING DEPLOY %DATE% %TIME%
  echo.
  cmd /c npx vercel --prod --yes --force
) > deploy_log.txt 2>&1

echo.
echo ==============================================================================
echo     PROCESSO FINALIZADO
echo     O relatorio foi salvo em deploy_log.txt
echo ==============================================================================
pause
