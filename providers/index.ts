import type { ApplicationContract } from '@ioc:Adonis/Core/Application';

export default class MinecraftDriverProvider {
	constructor(protected app: ApplicationContract) {}

	public async boot() {
		const Ally = this.app.container.resolveBinding('Adonis/Addons/Ally');
		const { MinecraftDriver } = await import('../src/MinecraftDriver/');

		// @ts-ignore
		Ally.extend('minecraft', (_, __, config, ctx) => {
			return new MinecraftDriver(ctx, config);
		});
	}
}
