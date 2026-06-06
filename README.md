# JR-CLI — John Reed Fitness CLI

**Réserve tes cours de sport directement depuis ton terminal.**

Reverse-engineering de l'API MySports/NOX utilisée par John Reed Fitness (groupe RSG), McFIT, et HEIMAT.

## Installation

```bash
git clone https://github.com/.../jr-cli.git
cd jr-cli
npm install  # optionnel, juste pour package.json
```

Zéro dépendance. Nécessite uniquement Node.js ≥ 16 et `curl`.

## Setup

```bash
# 1. Configure tes identifiants John Reed
echo 'JR_EMAIL=ton@email.com'  > ~/.jr.env
echo 'JR_P...ofJR_PASSWORD=ton_mot_de_passe' >> ~/.jr.env
chmod 600 ~/.jr.env

# 2. Connecte-toi
node jr.js login
# ✅ Connecté en tant que Papa birahim SEYE
#    Studio: John Reed Lyon

# 3. C'est prêt !
node jr.js list
```

## Usage

```
node jr.js setup     → Guide de configuration
node jr.js login     → Connexion (Basic Auth)
node jr.js whoami    → Infos du compte
node jr.js list      → Liste les cours à venir
node jr.js book <id> → Réserve un cours
node jr.js cancel <id> → Annule une réservation
node jr.js status    → Affiche mes réservations
```

### Options

| Flag | Description |
|------|-------------|
| `--json` | Sortie JSON pour scripts/parsing |
| `--studio <id>` | Forcer un studio spécifique |

### Exemples

```bash
# Lister les cours avec les barres de remplissage
node jr.js list

# Sortie JSON pour automatisation
node jr.js list --json | jq '.[] | select(.spots > 0)'

# Réserver le cours 9387363735
node jr.js book 9387363735

# Utiliser un autre studio (ex: Berlin Prenzlauer Berg)
node jr.js list --studio 1404492860
```

## Automatisation

```bash
# Dans un cron ou un script :
source ~/.jr.env && node jr.js list --json

# Réserver un cours spécifique dès qu'il est dispo :
source ~/.jr.env && node jr.js book 9387363735
```

La session est auto-gérée : si elle expire, une nouvelle est automatiquement créée.

## API Reverse-Engineered

L'API utilisée est **MySports/NOX** par Magicline, utilisée par le groupe RSG (John Reed, McFIT, HEIMAT).

### Authentification

```
POST https://my.johnreed.fitness/login
Authorization: Basic base64(email:password)
Content-Type: application/json

{"username": "email", "password": "password"}

→ Set-Cookie: SESSION=<uuid>
```

Le cookie SESSION est valable environ une heure. Les requêtes suivantes doivent inclure `Cookie: SESSION=...`.

### Endpoints

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| `GET` | `/nox/v1/me/info` | Infos utilisateur (nom, studio, customer ID) |
| `GET` | `/nox/public/v1/appointmentfilter/course?organizationUnitIds=X` | Filtres disponibles (studios, catégories) |
| `GET` | `/nox/v1/bookableitems/course/upcoming?organizationUnitId=X` | Liste des cours à venir |
| `GET` | `/nox/v1/bookableitems/course/{id}` | Détail d'un cours |
| `GET` | `/nox/v1/studios/{id}/utilization` | Taux d'occupation de la salle |
| `POST` | `/nox/v1/calendar/bookcourse` | Réserver un cours |
| `DELETE` | `/nox/v1/calendar/{id}/cancel-for-member` | Annuler une réservation |

### Réservation

```json
POST /nox/v1/calendar/bookcourse
{
  "courseAppointmentId": 9387363735,
  "expectedCustomerStatus": "BOOKED"
}
```

### Headers requis

```
x-tenant: rsg-group
x-nox-client-type: WEB
x-nox-web-context: v=1
```

### IDs de studios connus

| Studio | ID |
|--------|----|
| John Reed Lyon | 4882884510 |
| John Reed Paris So Ouest | 3069409560 |
| John Reed Berlin Prenzlauer Berg | 1404492860 |
| John Reed Wien Schottentor | 3961971910 |
| _...et tous les autres (utilise `--studio <id>`)_ |

Trouve l'ID de ton studio : connecte-toi sur le site, ouvre DevTools → Network, cherche une requête contenant `organizationUnitId`.

## Licence

MIT
