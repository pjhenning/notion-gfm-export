<script lang="ts">
	import type { PageData } from './$types';
  import { getMarkdownForPage } from '$lib/gfm-export';

	let { data }: { data: PageData } = $props();

	let pageID = $state('Page ID');

	console.log('sbData:');
	console.log(data.sbData);

	async function doExport() {
		console.log('its happening...');
		getMarkdownForPage(pageID, data.token);
	}
</script>

<h1>Exporter</h1>

<input type="text" bind:value={pageID}>
<button type="submit" onclick={doExport}>Export</button>
