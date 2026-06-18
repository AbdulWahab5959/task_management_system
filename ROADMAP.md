# Roadmap

Future implementation order:

1. RBAC
2. Admin Contact Messages
3. User Management
4. Activity Logs
5. Admin Analytics
6. Plans/Pricing
7. Stripe Subscriptions
8. Teams
9. Multi-Tenancy
10. Testing
11. Deployment

## Notes

- RBAC should come first because later admin, user management, analytics, billing, team, and tenant workflows depend on clear access control.
- Existing tenant, subscription, plan, invoice, tenant user, and activity log models/migrations are scaffolding until routes, controllers, policies, frontend screens, and tests are completed.
- Items not yet implemented should stay documented as pending or needs verification until verified through code and commands.
