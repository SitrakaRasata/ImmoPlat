<script lang="ts">
	let { data, form } = $props();
</script>

<h1 class="mb-6 text-2xl font-semibold">Edit listing</h1>

<form method="post" action="?/save" class="max-w-lg space-y-4">
	<label class="block">
		<span class="text-sm">Title</span>
		<input name="title" value={data.property.title} class="mt-1 w-full rounded border px-3 py-2" />
	</label>
	<label class="block">
		<span class="text-sm">City</span>
		<input name="city" value={data.property.city ?? ''} class="mt-1 w-full rounded border px-3 py-2" />
	</label>
	<label class="block">
		<span class="text-sm">Description</span>
		<textarea name="description" rows="5" class="mt-1 w-full rounded border px-3 py-2"
			>{data.property.description ?? ''}</textarea>
	</label>
	<label class="flex items-center gap-2">
		<input name="is_published" type="checkbox" checked={data.property.is_published} />
		<span class="text-sm">Published</span>
	</label>
	{#if form?.message}<p class="text-sm text-red-600">{form.message}</p>{/if}
	<button type="submit" class="rounded bg-black px-4 py-2 text-white">Save</button>
</form>

{#if data.isOwner}
	<h2 class="mt-10 mb-4 text-xl font-semibold">Mandates</h2>
	<ul class="mb-4 space-y-2">
		{#each data.mandates as mandate (mandate.agent_id)}
			<li class="flex items-center gap-3 rounded border p-3">
				<span class="font-mono text-sm">{mandate.agent_id}</span>
				<span class="text-sm text-gray-600">
					{mandate.expires_at ? `until ${mandate.expires_at}` : 'no expiry'}
				</span>
				<form method="post" action="?/revoke" class="ml-auto">
					<input type="hidden" name="agent_id" value={mandate.agent_id} />
					<button type="submit" class="text-sm underline">Revoke</button>
				</form>
			</li>
		{:else}
			<li class="text-gray-600">No mandate granted.</li>
		{/each}
	</ul>

	<form method="post" action="?/delegate" class="flex max-w-lg items-end gap-3">
		<label class="flex-1">
			<span class="text-sm">Agent id</span>
			<input name="agent_id" required class="mt-1 w-full rounded border px-3 py-2" />
		</label>
		<label>
			<span class="text-sm">Expires at</span>
			<input name="expires_at" type="date" class="mt-1 rounded border px-3 py-2" />
		</label>
		<button type="submit" class="rounded bg-black px-4 py-2 text-white">Delegate</button>
	</form>
{/if}
