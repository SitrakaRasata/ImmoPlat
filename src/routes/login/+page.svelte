<script lang="ts">
	let { form } = $props();
</script>

<h1 class="mb-6 text-2xl font-semibold">Sign in</h1>
<form method="post" action="?/login" class="max-w-sm space-y-4">
	<label class="block">
		<span class="text-sm">Email</span>
		<input name="email" type="email" required value={form?.email ?? ''}
			class="mt-1 w-full rounded border px-3 py-2" />
	</label>
	<label class="block">
		<span class="text-sm">Password</span>
		<input name="password" type="password" required
			class="mt-1 w-full rounded border px-3 py-2" />
	</label>
	{#if form?.message}<p role="alert" class="text-sm text-red-600">{form.message}</p>{/if}
	<button type="submit" class="rounded bg-black px-4 py-2 text-white">Sign in</button>
</form>
