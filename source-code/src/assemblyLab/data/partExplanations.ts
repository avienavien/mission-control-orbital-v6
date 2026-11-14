export interface PartExplanation {
  whatItDoes: string;
  simplified: string;
}

export const PART_EXPLANATIONS: Record<string, PartExplanation> = {
  bus_cubesat_6u: {
    whatItDoes: 'Provides the satellite frame and mounting points for its equipment.',
    simplified: 'A small frame that holds the satellite parts together.',
  },
  bus_hex_telecom: {
    whatItDoes: 'Supports communications equipment and provides strong places to attach parts.',
    simplified: 'The satellite body that the equipment attaches to.',
  },
  bus_octa_probe: {
    whatItDoes: 'Supports heavier equipment and propulsion on long-distance missions.',
    simplified: 'A larger, stronger body for a deep-space satellite.',
  },
  pwr_wing_deployable: {
    whatItDoes: 'Opens in orbit and converts sunlight into electrical power.',
    simplified: 'Fold-out wings that turn sunlight into electricity.',
  },
  pwr_body_solar: {
    whatItDoes: 'Generates electricity from sunlight without unfolding.',
    simplified: 'Solar cells attached directly to the satellite body.',
  },
  pwr_rtg_nuclear: {
    whatItDoes: 'Makes steady electricity from heat released by radioisotope material.',
    simplified: 'A generator that uses heat to make electricity far from the Sun.',
  },
  pwr_battery_pack: {
    whatItDoes: 'Stores electrical energy for times when power generation is low.',
    simplified: 'A rechargeable battery for when the satellite is in darkness.',
  },
  prop_hall_ion: {
    whatItDoes: 'Uses electric power to push out xenon and gradually change the orbit.',
    simplified: 'A very fuel-efficient engine that slowly steers the satellite.',
  },
  prop_biprop_main: {
    whatItDoes: 'Burns two propellants to produce strong thrust for major orbit changes.',
    simplified: 'A powerful rocket engine for big moves in space.',
  },
  prop_rcs_quad: {
    whatItDoes: 'Uses small gas jets to turn, steady, and position the spacecraft.',
    simplified: 'Small steering jets that turn the satellite.',
  },
  av_flight_computer: {
    whatItDoes: 'Runs onboard software, processes commands, and manages spacecraft systems.',
    simplified: 'The satellite’s computer that controls its equipment.',
  },
  av_reaction_wheels: {
    whatItDoes: 'Changes the spacecraft’s direction by speeding up or slowing down internal wheels.',
    simplified: 'Spinning wheels that help point the satellite without using fuel.',
  },
  av_star_tracker: {
    whatItDoes: 'Compares star positions with a map to determine which way the spacecraft faces.',
    simplified: 'A camera that uses stars to work out the satellite’s direction.',
  },
  comm_hga_dish: {
    whatItDoes: 'Focuses radio signals to send large amounts of data over long distances.',
    simplified: 'A dish antenna for sending lots of data to Earth.',
  },
  comm_helical_uhf: {
    whatItDoes: 'Provides a wide-coverage radio link for commands and basic data.',
    simplified: 'An antenna for everyday messages between the satellite and Earth.',
  },
  comm_laser_link: {
    whatItDoes: 'Uses a focused infrared laser to transfer data at high rates between spacecraft.',
    simplified: 'A laser that sends data quickly to another satellite.',
  },
  pay_multispectral: {
    whatItDoes: 'Captures detailed images of Earth through several bands of light.',
    simplified: 'A telescope camera that takes detailed pictures of Earth.',
  },
  pay_sar_radar: {
    whatItDoes: 'Uses radar echoes to map Earth through clouds and in darkness.',
    simplified: 'Radar that can make Earth images at night or through clouds.',
  },
  pay_magnetometer: {
    whatItDoes: 'Measures magnetic fields while keeping the sensor away from spacecraft interference.',
    simplified: 'A sensor on a long arm that measures magnetism in space.',
  },
  pay_spectrometer: {
    whatItDoes: 'Measures the energy and type of charged particles and gases around the spacecraft.',
    simplified: 'An instrument that checks what gases and tiny particles are made of.',
  },
  thm_radiator_vane: {
    whatItDoes: 'Moves excess equipment heat to a radiator surface that releases it into space.',
    simplified: 'A heat-release panel that helps keep equipment cool.',
  },
  thm_mli_blanket: {
    whatItDoes: 'Insulates equipment from rapid temperature changes in sunlight and shadow.',
    simplified: 'A reflective blanket that helps keep equipment at a steady temperature.',
  },
  thm_whipple_shield: {
    whatItDoes: 'Breaks up small fast-moving debris before it can reach the spacecraft hull.',
    simplified: 'An outer shield that helps protect the satellite from tiny space debris.',
  },
};
