# Esquema de Base de Datos (EER Diagram)

Aquí tienes una representación visual de las relaciones entre tus tablas. Puedes previsualizar este archivo en VS Code (Ctrl+Shift+V) para ver el gráfico.

```mermaid
erDiagram
    USERS {
        int id PK
        string username
        string email
        string password_hash
        timestamp created_at
    }

    OWNERS {
        int id PK
        string name
        string email
        string phone
        string cbu_alias
        timestamp created_at
    }

    PROPERTIES {
        int id PK
        string address
        int owner_id FK
        string photo_url
        timestamp created_at
    }

    TENANTS {
        int id PK
        string name
        string email
        string phone
        timestamp created_at
    }

    CONTRACTS {
        int id PK
        int property_id FK
        int tenant_id FK
        date start_date
        date end_date
        decimal current_rent
        int rent_due_day
        decimal increase_rate
        int increase_frequency_months
        boolean notify_rent_expiry
        boolean notify_punitive_interests
        string contract_file_url
        string status
        timestamp created_at
    }

    %% Relaciones
    OWNERS ||--o{ PROPERTIES : "posee"
    PROPERTIES ||--o{ CONTRACTS : "tiene"
    TENANTS ||--o{ CONTRACTS : "firma"
```

### Descripción de Relaciones
1.  **Owners -> Properties**: Un propietario puede tener muchas propiedades (1 a N).
2.  **Properties -> Contracts**: Una propiedad puede tener contratos asociados (historial).
3.  **Tenants -> Contracts**: Un inquilino está asociado a contratos.
