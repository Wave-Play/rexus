/**
 * © 2021 WavePlay <dev@waveplay.com>
 */
import { mutationField, queryField } from "nexus";

interface RexusInitOptions {
	context?: unknown;
	resolvers: Record<string, RexusOperation>;
}

interface RexusOperation {
	name: string;
	resolver: (args: unknown) => unknown | Promise<unknown>;
	type: "query" | "mutation";
}

/**
 * Rexus is Nexus' bestie.
 *
 * It allows for the separation of resolver definitions vs implementations.
 * This unlocks the ability to generate schemas without building the entire project.
 * With Docker, this can be a massive improvement as it allows for layer caching & parallel builds.
 *
 * As a bonus, it enables resolvers to call one another within the same shared context!
 * The downsides? Well, additional overhead for one. Types are also lost with Rexus... for now.
 */
class Rexus {
	// Linked resolvers
	private readonly _mutations = new Map<string, any>();
	private readonly _queries = new Map<string, any>();

	// Temporary store for extra resolver data
	private readonly _context = new Map<number, any>();
	private readonly _parent = new Map<number, any>();
	private readonly _info = new Map<number, any>();

	// Registered plugins to use as context
	private readonly _plugins: any[] = [];

	// Incremental basic ID
	private _id = 0;

	// Initialize with resolver and context links
	public init(options: RexusInitOptions) {
		for (const resolverKey in options.resolvers) {
			if (options.resolvers.hasOwnProperty(resolverKey)) {
				const operation = options.resolvers[resolverKey];

				if (operation.type === "query") {
					this._queries.set(operation.name, operation.resolver);
				} else if (operation.type === "mutation") {
					this._mutations.set(operation.name, operation.resolver);
				}
			}
		}
	}

	// Registers a plugin to modify and/or read each response context
	public addPlugin(plugin: any) {
		this._plugins.push(plugin);
	}

	// Returns context for a runnable reference
	public context<T>(reference: Runnable): T {
		return this._context.get(reference.id);
	}

	// Meant to be used when creating an Apollo Server in order to pass down our plugins
	public createContext(): any {
		return async (serverContext: any) => {
			let context = {};
			for (const plugin of this._plugins) {
				context = {
					...context,
					...(await plugin(serverContext)),
				};
			}

			return context;
		};
	}

	// Convenience function that automatically extends a Nexus mutation and links with Rexus
	public createMutation(name: string, config: any) {
		return mutationField(name, {
			...config,
			resolve: this.link(),
		});
	}

	// Convenience function that automatically extends a Nexus query and links with Rexus
	public createQuery(name: string, config: any) {
		return queryField(name, {
			...config,
			resolve: this.link(),
		});
	}

	// Returns info for a runnable reference
	public info(reference: Runnable) {
		return this._info.get(reference.id);
	}

	// Assign implementation for the specified mutation resolver
	public linkedMutation(
		name: string,
		resolver: (args: any) => any | Promise<any>
	): RexusOperation {
		return {
			name,
			resolver,
			type: "mutation",
		};
	}

	// Assign implementation for the specified query resolver
	public linkedQuery(
		name: string,
		resolver: (args: any) => any | Promise<any>
	): RexusOperation {
		return {
			name,
			resolver,
			type: "query",
		};
	}

	// Binds Rexus to a Nexus resolver. Once called, Rexus will do it's thing. Rawr.
	public link() {
		const rexus = this;

		return async (parent: any, args: any, context: any, info: any) => {
			const resolvers =
				info.operation.operation === "mutation"
					? rexus._mutations
					: rexus._queries;
			const resolver = resolvers.get(info.fieldName);

			return this.run(function (this: { id: any }) {
				try {
					rexus._context.set(this.id, context);
					rexus._parent.set(this.id, parent);
					rexus._info.set(this.id, info);

					return resolver.call(this, args);
				} finally {
					rexus._context.delete(this.id);
					rexus._parent.delete(this.id);
					rexus._info.delete(this.id);
				}
			});
		};
	}

	// Executes another resolver with the specified parameters
	public mutate(name: string, args: any = {}, options: any = {}) {
		const { context, info, parent } = options;
		const resolver = this._mutations.get(name);
		const rexus = this;

		return this.run(function (this: { id: any }) {
			try {
				rexus._context.set(this.id, context);
				rexus._parent.set(this.id, parent);
				rexus._info.set(this.id, info);

				return resolver.call(this, args);
			} finally {
				rexus._context.delete(this.id);
				rexus._parent.delete(this.id);
				rexus._info.delete(this.id);
			}
		});
	}

	// Returns parent for a runnable reference
	public parent(reference: Runnable) {
		return this._parent.get(reference.id);
	}

	// Executes another resolver with the specified parameters
	public query(name: string, args: any = {}, options: any = {}) {
		const { context, info, parent } = options;
		const resolver = this._queries.get(name);
		const rexus = this;

		return this.run(function (this: { id: any }) {
			try {
				rexus._context.set(this.id, context);
				rexus._parent.set(this.id, parent);
				rexus._info.set(this.id, info);

				return resolver.call(this, args);
			} finally {
				rexus._context.delete(this.id);
				rexus._parent.delete(this.id);
				rexus._info.delete(this.id);
			}
		});
	}

	private run(callback: any) {
		return new Runnable(this._id++).run(function (this: { id: any }) {
			return callback.call(this);
		});
	}
}

class Runnable {
	id: number = 0;

	constructor(id: number) {
		this.id = id;
	}

	public run(callback: any) {
		return callback.call(this);
	}
}

const rexus = new Rexus();
export default rexus;
