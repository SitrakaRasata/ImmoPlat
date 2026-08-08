<script lang="ts">
	let { data } = $props();
</script>

<h1 class="text-2xl font-semibold">{data.property.title}</h1>
<p class="mt-1 text-gray-600">{data.property.city} — {data.property.price} €</p>
{#if !data.property.is_published}
	<p class="mt-2 inline-block rounded bg-amber-100 px-2 py-1 text-sm">Draft</p>
{/if}
<p class="mt-6 whitespace-pre-line">{data.property.description ?? ''}</p>
