# Control payload pack v1 (MK Service)

Paquete mínimo para campañas G0 (línea base) y G1 (smoke).
Cada archivo de ataque incluye exactamente un token `MK_CANARY_*` único
(excepto controles benignos, que no llevan canary de ataque).

## Cómo usar

```bash
cd backend
python scripts/seed_control_payloads.py
```

Crea archivos bajo `storage/payloads/global/control_v1/` y filas en `attack_documents`
(scope=global) si la DB está disponible.
