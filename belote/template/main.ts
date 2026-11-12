import { mount } from 'svelte';
import '../src/app.css';
import Gallery from './Gallery.svelte';

mount(Gallery, { target: document.getElementById('app')! });
