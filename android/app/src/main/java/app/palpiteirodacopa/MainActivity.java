package app.palpiteirodacopa;

import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import androidx.appcompat.app.AlertDialog;
import com.getcapacitor.BridgeActivity;
import com.google.firebase.remoteconfig.FirebaseRemoteConfig;
import com.google.firebase.remoteconfig.FirebaseRemoteConfigSettings;
import app.palpiteirodacopa.BuildConfig;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // 1. Inicializar Firebase Remote Config
        FirebaseRemoteConfig mFirebaseRemoteConfig = FirebaseRemoteConfig.getInstance();
        FirebaseRemoteConfigSettings configSettings = new FirebaseRemoteConfigSettings.Builder()
                .setMinimumFetchIntervalInSeconds(3600) // Em produção, mude para 3600
                .build();
        mFirebaseRemoteConfig.setConfigSettingsAsync(configSettings);

        // 2. Buscar valores do Firebase
        mFirebaseRemoteConfig.fetchAndActivate()
            .addOnCompleteListener(this, task -> {
                if (task.isSuccessful()) {
                    // Pega o valor que você criou no Firebase
                    long versaoMinima = mFirebaseRemoteConfig.getLong("versao_minima_android");
                    
                    // VERSÃO ATUAL DO SEU APP (Pega automaticamente do build.gradle)
                    long versaoAtual = BuildConfig.VERSION_CODE; 

                    if (versaoAtual < versaoMinima) {
                        mostrarAlertaAtualizacao(versaoMinima);
                    }
                }
            });
    }

    private void mostrarAlertaAtualizacao(long versaoNova) {
        AlertDialog.Builder builder = new AlertDialog.Builder(this);
        builder.setTitle("Atualização Obrigatória");
        builder.setMessage("Uma nova versão (v" + versaoNova + ") do Palpiteiro da Copa está disponível! Atualize para continuar enviando seus palpites.");
        builder.setCancelable(false);
        builder.setPositiveButton("Atualizar Agora", (dialog, which) -> {
            String url = "https://play.google.com/store/apps/details?id=app.palpiteirodacopa";
            Intent i = new Intent(Intent.ACTION_VIEW);
            i.setData(Uri.parse(url));
            startActivity(i);
            finish(); // Fecha o app para forçar a ida à loja
        });
        builder.show();
    }
}
