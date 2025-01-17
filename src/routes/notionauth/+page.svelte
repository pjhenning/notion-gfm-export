<script lang="ts">
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<h1>Notion Authorization</h1>

{#if data.success}
	<h2>Success!</h2>
{:else}
	<h2>Something went wrong:</h2>
	<p>{data.error}</p>
{/if}
