# Codaro (SOS Reporter)

System zgłoszeń / dispatch: mobilna aplikacja zgłoszeniowo-interwencyjna (klient) +
panel administracyjny + backend czasu rzeczywistego, z transmisją lokalizacji, obrazu
i dźwięku, kolejkowaniem zgłoszeń oraz priorytetyzacją (ręczną i AI).

Pełny opis architektury, modelu domenowego i konwencji projektu: zobacz [`CLAUDE.md`](./CLAUDE.md)
— to jest źródło prawdy dla tego repozytorium.

## Ściągawka komend

```bash
# Backend (w Dockerze)
docker compose up -d
docker compose exec app php artisan migrate --seed
docker compose exec app php artisan reverb:start
docker compose exec app php artisan queue:work
docker compose exec app ./vendor/bin/pint
docker compose exec app ./vendor/bin/pest

# Mobile
cd mobile
npx expo start --dev-client
eas build --profile preview --platform all
eas update --branch production
```
