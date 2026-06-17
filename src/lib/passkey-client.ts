import {
  startAuthentication,
  startRegistration,
} from "@simplewebauthn/browser";
import type {
  AuthenticationResponseJSON,
  PublicKeyCredentialCreationOptionsJSON,
  PublicKeyCredentialRequestOptionsJSON,
  RegistrationResponseJSON,
} from "@simplewebauthn/browser";

export async function createPasskey(
  options: PublicKeyCredentialCreationOptionsJSON
): Promise<RegistrationResponseJSON> {
  return startRegistration({ optionsJSON: options });
}

export async function usePasskey(
  options: PublicKeyCredentialRequestOptionsJSON
): Promise<AuthenticationResponseJSON> {
  return startAuthentication({ optionsJSON: options });
}
