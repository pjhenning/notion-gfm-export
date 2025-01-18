<script lang="ts">
	import type { ActionData } from './$types';

	let { form }: { form: ActionData } = $props();
</script>

<h1>Exporter</h1>


{#if form?.md}
	<h2>Success!</h2>
	<h3>Here ya go cowboy:</h3>
	<textarea style="width: 80%; min-height: 60vh" readonly={true}>{form.md}</textarea>
{:else}
<h2>push button 2 win</h2>
<form method="POST">
	<button type="submit">Export</button>
</form>
{/if}
