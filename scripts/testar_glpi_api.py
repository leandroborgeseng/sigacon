import json
import requests

API_URL = "https://suporte.franca.sp.gov.br/apirest.php/initSession"
APP_TOKEN = "OqtUADfjzqGvbomYwyH3ojHElm9giNVTiu0PYNkt"
USER_TOKEN = "OJWw6YjPf2FPBjjb6yUEeQXxeqiVrUdpkMXDoFC9"


def testar_conexao_api_glpi():
    """
    Testa a conexão com a API REST do GLPI usando as credenciais fornecidas.
    """
    headers = {
        "App-Token": APP_TOKEN,
        "Authorization": f"user_token {USER_TOKEN}",
        "Content-Type": "application/json",
    }

    print(f"Tentando conectar a: {API_URL}")
    print(f"Com os headers: {json.dumps(headers, indent=2)}")

    try:
        response = requests.post(API_URL, headers=headers, json={}, timeout=30)
        response.raise_for_status()

        print("\n--- Conexao BEM SUCEDIDA! ---")
        print(f"Status Code: {response.status_code}")

        try:
            response_json = response.json()
            print("Resposta JSON da API:")
            print(json.dumps(response_json, indent=2, ensure_ascii=False))

            if "session_token" in response_json:
                print(f"\nToken de Sessao Recebido: {response_json['session_token']}")
                print("Voce pode usar este token para autenticar futuras requisicoes.")
            else:
                print("Atencao: 'session_token' nao encontrado na resposta.")

        except json.JSONDecodeError:
            print("Resposta da API nao e um JSON valido:")
            print(response.text)

    except requests.exceptions.HTTPError as http_err:
        print(f"\n--- Erro HTTP ao conectar a API: {http_err} ---")
        print(f"Status Code: {response.status_code}")
        print(f"Corpo da Resposta: {response.text}")
        if response.status_code in (401, 403):
            print("Verifique se seus tokens estao corretos e validos.")
    except requests.exceptions.ConnectionError as conn_err:
        print(f"\n--- Erro de Conexao: {conn_err} ---")
        print("Verifique internet e URL da API.")
    except requests.exceptions.Timeout as timeout_err:
        print(f"\n--- Erro de Timeout: {timeout_err} ---")
        print("A requisicao demorou muito para ser respondida.")
    except requests.exceptions.RequestException as req_err:
        print(f"\n--- Ocorreu um erro inesperado: {req_err} ---")


if __name__ == "__main__":
    testar_conexao_api_glpi()
