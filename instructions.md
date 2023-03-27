Make sure to first define the mapping inside the `contracts/ally.ts` file as follows.

```ts
import {
	MinecraftDriver,
	MinecraftDriverConfig,
} from '@crafty.gg/ally-minecraft-driver/build/standalone';

declare module '@ioc:Adonis/Addons/Ally' {
	interface SocialProviders {
		// ... other mappings
		minecraft: {
			config: MinecraftDriverConfig;
			implementation: MinecraftDriver;
		};
	}
}
```
