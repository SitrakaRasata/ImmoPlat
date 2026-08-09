<script lang="ts">
	let { data } = $props();
</script>

<h1 class="mb-6 text-2xl font-semibold">Listings</h1>
<ul class="space-y-3">
	{#each data.properties as property (property.id)}
		<li class="rounded border p-4">
			<a href="/properties/{property.id}" class="font-medium">{property.title}</a>
			{#if !property.is_published}<span class="ml-2 text-sm text-amber-700">Draft</span>{/if}
			<p class="text-sm text-gray-600">{property.city} — {property.price} €</p>
		</li>
	{:else}
		<li class="text-gray-600">No listings available.</li>
	{/each}
</ul>
