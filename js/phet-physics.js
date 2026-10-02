(() => {
  const mount = document.getElementById("phetCatalog");
  const search = document.getElementById("phetSearch");
  const count = document.getElementById("phetCount");
  const category = document.getElementById("phetCategory");
  if (!mount || !search || !count || !category) return;

  const simulations = [{"title":"Quantum Wave Interference","slug":"quantum-wave-interference","category":"Quantum Phenomena"},{"title":"Quantum Coin Toss","slug":"quantum-coin-toss","category":"Quantum Phenomena"},{"title":"Quantum Measurement","slug":"quantum-measurement","category":"Quantum Phenomena"},{"title":"Models of the Hydrogen Atom","slug":"models-of-the-hydrogen-atom","category":"Quantum Phenomena"},{"title":"Buoyancy: Basics","slug":"buoyancy-basics","category":"Heat & Thermo"},{"title":"Buoyancy","slug":"buoyancy","category":"Heat & Thermo"},{"title":"Generator","slug":"generator","category":"Electricity, Magnets & Circuits"},{"title":"Magnets and Electromagnets","slug":"magnets-and-electromagnets","category":"Electricity, Magnets & Circuits"},{"title":"Magnet and Compass","slug":"magnet-and-compass","category":"Electricity, Magnets & Circuits"},{"title":"Faraday's Electromagnetic Lab","slug":"faradays-electromagnetic-lab","category":"Electricity, Magnets & Circuits"},{"title":"Projectile Data Lab","slug":"projectile-data-lab","category":"Motion & Energy"},{"title":"Build a Nucleus","slug":"build-a-nucleus","category":"Quantum Phenomena"},{"title":"Kepler's Laws","slug":"keplers-laws","category":"Motion & Energy"},{"title":"Sound Waves","slug":"sound-waves","category":"Sound & Waves"},{"title":"My Solar System","slug":"my-solar-system","category":"Motion & Energy"},{"title":"Calculus Grapher","slug":"calculus-grapher","category":"Physics"},{"title":"Geometric Optics: Basics","slug":"geometric-optics-basics","category":"Light & Radiation"},{"title":"Geometric Optics","slug":"geometric-optics","category":"Light & Radiation"},{"title":"Density","slug":"density","category":"Heat & Thermo"},{"title":"Circuit Construction Kit: AC","slug":"circuit-construction-kit-ac","category":"Electricity, Magnets & Circuits"},{"title":"Circuit Construction Kit: AC - Virtual Lab","slug":"circuit-construction-kit-ac-virtual-lab","category":"Electricity, Magnets & Circuits"},{"title":"Normal Modes","slug":"normal-modes","category":"Sound & Waves"},{"title":"Fourier: Making Waves","slug":"fourier-making-waves","category":"Sound & Waves"},{"title":"Collision Lab","slug":"collision-lab","category":"Motion & Energy"},{"title":"Energy Skate Park","slug":"energy-skate-park","category":"Motion & Energy"},{"title":"Vector Addition","slug":"vector-addition","category":"Motion & Energy"},{"title":"Curve Fitting","slug":"curve-fitting","category":"Physics"},{"title":"Gravity Force Lab: Basics","slug":"gravity-force-lab-basics","category":"Motion & Energy"},{"title":"Waves Intro","slug":"waves-intro","category":"Sound & Waves"},{"title":"Diffusion","slug":"diffusion","category":"Heat & Thermo"},{"title":"Gases Intro","slug":"gases-intro","category":"Heat & Thermo"},{"title":"Gas Properties","slug":"gas-properties","category":"Physics"},{"title":"Blackbody Spectrum","slug":"blackbody-spectrum","category":"Light & Radiation"},{"title":"Masses and Springs: Basics","slug":"masses-and-springs-basics","category":"Motion & Energy"},{"title":"Energy Forms and Changes","slug":"energy-forms-and-changes","category":"Motion & Energy"},{"title":"Wave Interference","slug":"wave-interference","category":"Sound & Waves"},{"title":"Coulomb's Law","slug":"coulombs-law","category":"Electricity, Magnets & Circuits"},{"title":"Masses and Springs","slug":"masses-and-springs","category":"Motion & Energy"},{"title":"Capacitor Lab: Basics","slug":"capacitor-lab-basics","category":"Electricity, Magnets & Circuits"},{"title":"Circuit Construction Kit: DC - Virtual Lab","slug":"circuit-construction-kit-dc-virtual-lab","category":"Electricity, Magnets & Circuits"},{"title":"Circuit Construction Kit: DC","slug":"circuit-construction-kit-dc","category":"Electricity, Magnets & Circuits"},{"title":"Pendulum Lab","slug":"pendulum-lab","category":"Motion & Energy"},{"title":"Projectile Motion","slug":"projectile-motion","category":"Motion & Energy"},{"title":"States of Matter: Basics","slug":"states-of-matter-basics","category":"Heat & Thermo"},{"title":"States of Matter","slug":"states-of-matter","category":"Heat & Thermo"},{"title":"Gravity and Orbits","slug":"gravity-and-orbits","category":"Motion & Energy"},{"title":"Plinko Probability","slug":"plinko-probability","category":"Physics"},{"title":"Atomic Interactions","slug":"atomic-interactions","category":"Quantum Phenomena"},{"title":"Charges and Fields","slug":"charges-and-fields","category":"Electricity, Magnets & Circuits"},{"title":"Rutherford Scattering","slug":"rutherford-scattering","category":"Quantum Phenomena"},{"title":"Bending Light","slug":"bending-light","category":"Light & Radiation"},{"title":"Hooke's Law","slug":"hookes-law","category":"Motion & Energy"},{"title":"Molecules and Light","slug":"molecules-and-light","category":"Light & Radiation"},{"title":"Energy Skate Park: Basics","slug":"energy-skate-park-basics","category":"Motion & Energy"},{"title":"Faraday's Law","slug":"faradays-law","category":"Electricity, Magnets & Circuits"},{"title":"Wave on a String","slug":"wave-on-a-string","category":"Sound & Waves"},{"title":"Color Vision","slug":"color-vision","category":"Light & Radiation"},{"title":"Balancing Act","slug":"balancing-act","category":"Motion & Energy"},{"title":"Under Pressure","slug":"under-pressure","category":"Heat & Thermo"},{"title":"Friction","slug":"friction","category":"Motion & Energy"},{"title":"Forces and Motion: Basics","slug":"forces-and-motion-basics","category":"Motion & Energy"},{"title":"John Travoltage","slug":"john-travoltage","category":"Electricity, Magnets & Circuits"},{"title":"Gravity Force Lab","slug":"gravity-force-lab","category":"Motion & Energy"},{"title":"Balloons and Static Electricity","slug":"balloons-and-static-electricity","category":"Electricity, Magnets & Circuits"},{"title":"Ohm's Law","slug":"ohms-law","category":"Electricity, Magnets & Circuits"},{"title":"Resistance in a Wire","slug":"resistance-in-a-wire","category":"Electricity, Magnets & Circuits"},{"title":"Build an Atom","slug":"build-an-atom","category":"Physics"}];

  const esc = value => String(value).replace(/[&<>"']/g, ch => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
  }[ch]));

  const render = () => {
    const q = search.value.trim().toLowerCase();
    const cat = category.value;
    const filtered = simulations.filter(sim =>
      (!q || sim.title.toLowerCase().includes(q) || sim.category.toLowerCase().includes(q)) &&
      (!cat || sim.category === cat)
    );

    count.textContent = filtered.length + " of " + simulations.length + " simulations";

    mount.innerHTML = filtered.map((sim, i) => `
      <a class="phet-tile" href="https://phet.colorado.edu/en/simulations/${encodeURIComponent(sim.slug)}" target="_blank" rel="noopener noreferrer">
        <span class="phet-index">${String(i + 1).padStart(2,"0")}</span>
        <span class="card-kicker">${esc(sim.category)}</span>
        <h4>${esc(sim.title)}</h4>
        <span class="launch">Open original simulation ↗</span>
      </a>
    `).join("") || '<div class="phet-empty">No simulations match that search.</div>';
  };

  const categories = [...new Set(simulations.map(sim => sim.category))].sort();
  categories.forEach(cat => {
    const option = document.createElement("option");
    option.value = cat;
    option.textContent = cat;
    category.appendChild(option);
  });

  search.addEventListener("input", render);
  category.addEventListener("change", render);
  render();
})();