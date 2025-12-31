@echo off
color 0E
cls
echo ==============================================================================
echo                       PHOCO ADMIN - REPARO DE LOGIN
echo ==============================================================================
echo.
echo     ERRO DETECTADO: O sistema diz que seu "Token" expirou.
echo     SOLUCAO: Precisamos fazer login novamente.
echo.
echo     [PASSO 1] FAZER LOGIN
echo     Siga as instrucoes que vao aparecer (escolha Email, confirme, etc).
echo.
call npx vercel login
echo.
echo ==============================================================================
echo.
echo     [PASSO 2] ENVIANDO ATUALIZACOES (BRINDES E CORRECOES)
echo     Agora que voce logou, vamos enviar o codigo novo.
echo     DIGITE "Y" ou ENTER se ele perguntar qualquer coisa.
echo.
call npx vercel --prod
echo.
echo ==============================================================================
echo     PRONTO! 
echo     Se apareceu "Production: https://..." deu tudo certo.
echo     Acesse: https://phocoadmin.vercel.app
echo ==============================================================================
pause
