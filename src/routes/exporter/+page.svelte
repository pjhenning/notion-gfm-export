<script lang="ts">
	import type { PageData } from './$types';
  import { getMarkdownForPage } from '$lib/gfm-export';

	let { data }: { data: PageData } = $props();

	let pageID = $state('Page ID');

	async function doExport() {
		console.log('its happening...');
		const md = getMarkdownForPage(pageID, data.token);
		console.log({md});
	}
</script>

<h1>Exporter</h1>

<input type="text" bind:value={pageID}>
<button type="submit" onclick={doExport}>Export</button>
