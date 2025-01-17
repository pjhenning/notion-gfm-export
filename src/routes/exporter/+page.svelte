<script lang="ts">
	import type { ActionData } from './$types';

	let { form }: { form: ActionData } = $props();

	if (form?.md) {
		console.log('here you go:');
		console.log({ md: form.md });
	}
</script>

<h1>Exporter</h1>


{#if form?.md}
	<h2>Success!</h2>
{:else}
<h2>push button 2 win</h2>
<form method="POST">
	<button type="submit">Export</button>
</form>
{/if}
