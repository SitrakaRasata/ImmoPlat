<script lang="ts">
	let { data } = $props();
</script>

<h1 class="mb-6 text-2xl font-semibold">My listings</h1>
<ul class="space-y-3">
	{#each data.owned as property (property.id)}
		<li class="rounded border p-4">
			<a href="/agent/properties/{property.id}">{property.title}</a>
			{#if !property.is_published}<span class="ml-2 text-sm text-amber-700">Draft</span>{/if}
		</li>
	{:else}
		<li class="text-gray-600">You own no listings.</li>
	{/each}
</ul>

<h2 class="mt-10 mb-4 text-xl font-semibold">Delegated to me</h2>
<ul class="space-y-3">
	{#each data.delegated as property (property.id)}
		<li class="rounded border p-4">
			<a href="/agent/properties/{property.id}">{property.title}</a>
		</li>
	{:else}
		<li class="text-gray-600">No listing has been delegated to you.</li>
	{/each}
</ul>
