<script lang="ts">
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';

	let { data, children } = $props();
</script>

<svelte:head><link rel="icon" href={favicon} /></svelte:head>

<nav class="flex items-center gap-4 border-b px-6 py-3">
	<a href="/" class="font-semibold">immo-grant</a>
	{#if data.user}
		<a href="/agent">My listings</a>
		<form method="post" action="/login?/signout" class="ml-auto">
			<button type="submit">Sign out</button>
		</form>
	{:else}
		<a href="/login" class="ml-auto">Sign in</a>
	{/if}
</nav>

<main class="mx-auto max-w-3xl px-6 py-8">
	{@render children()}
</main>
