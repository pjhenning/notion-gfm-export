<script lang="ts">
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	console.log(data.searchParams);
	console.log(data.auth);
</script>

<h1>Notion Authorization</h1>
