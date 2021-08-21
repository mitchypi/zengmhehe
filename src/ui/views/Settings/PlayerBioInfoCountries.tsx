import { csvFormat, csvParse } from "d3-dsv";
import { ChangeEvent, useEffect, useRef, useState } from "react";
import { Dropdown, Modal } from "react-bootstrap";
import type { PlayerBioInfo, Race, ThenArg } from "../../../common/types";
import {
	confirm,
	downloadFile,
	helpers,
	logEvent,
	resetFileInput,
	toWorker,
} from "../../util";
import classNames from "classnames";
import {
	Defaults,
	formatPlayerBioInfoState,
	isInvalidNumber,
	objectToArray,
	PageInfo,
	PlayerBioInfoState,
} from "./PlayerBioInfo";

// https://stackoverflow.com/a/35200633/786644
const ImportButton = ({
	defaults,
	setErrorMessage,
	setInfoState,
}: {
	defaults: Defaults | undefined;
	setErrorMessage: (errorMessage?: string) => void;
	setInfoState: (injuries: PlayerBioInfoState) => void;
}) => (
	<button
		className="btn btn-light-bordered"
		style={{ position: "relative", overflow: "hidden" }}
		onClick={() => {}}
	>
		Import
		<input
			className="cursor-pointer"
			type="file"
			style={{
				position: "absolute",
				top: 0,
				right: 0,
				minWidth: "100%",
				minHeight: "100%",
				fontSize: 100,
				display: "block",
				filter: "alpha(opacity=0)",
				opacity: 0,
				outline: "none",
			}}
			onClick={resetFileInput}
			onChange={event => {
				if (!event.target.files) {
					return;
				}
				const file = event.target.files[0];
				if (!file) {
					return;
				}

				setErrorMessage();

				const reader = new window.FileReader();
				reader.readAsText(file);

				reader.onload = async event2 => {
					try {
						// @ts-ignore
						const rows = csvParse(event2.currentTarget.result);

						if (
							!rows.columns.includes("name") ||
							!rows.columns.includes("frequency") ||
							!rows.columns.includes("games")
						) {
							setErrorMessage(
								"File should be a CSV file with columns: name, frequency, games",
							);
							return;
						}

						setInfoState(formatPlayerBioInfoState(rows as any, defaults));
					} catch (error) {
						setErrorMessage(error.message);
						return;
					}
				};
			}}
		/>
	</button>
);

const ExportButton = ({ infoState }: { infoState: PlayerBioInfoState }) => (
	<button
		className="btn btn-light-bordered"
		onClick={() => {
			const output = csvFormat(infoState, ["name", "frequency", "games"]);

			downloadFile("injuries.csv", output, "text/csv");
		}}
	>
		Export
	</button>
);

type SetInfoState = (
	infoState:
		| PlayerBioInfoState
		| ((infoState: PlayerBioInfoState) => PlayerBioInfoState),
) => void;

type CountryRow = PlayerBioInfoState["countries"][number];

const Controls = ({
	defaults,
	defaultsState,
	infoState,
	position,
	setInfoState,
}: {
	defaults: Defaults;
	defaultsState: PlayerBioInfoState;
	infoState: PlayerBioInfoState;
	position: "top" | "bottom";
	setInfoState: SetInfoState;
}) => {
	const [importErrorMessage, setImportErrorMessage] = useState<
		string | undefined
	>();

	const addCountry = (newCountry: CountryRow) => {
		if (position === "top") {
			setInfoState(data => ({
				...data,
				countries: [newCountry, ...data.countries],
			}));
		} else {
			setInfoState(data => ({
				...data,
				countries: [...data.countries, newCountry],
			}));
		}
	};

	const currentCountryNames = new Set(
		infoState.countries.map(row => row.country),
	);
	const defaultCountriesAvailable = defaultsState.countries.filter(
		row => !currentCountryNames.has(row.country),
	);

	return (
		<>
			<div className="d-flex justify-content-between">
				<div className="btn-group">
					<Dropdown>
						<Dropdown.Toggle
							className="btn-light-bordered btn-light-bordered-group-left"
							variant="foo"
							id="dropdown-countries-add"
						>
							Add
						</Dropdown.Toggle>

						<Dropdown.Menu>
							<Dropdown.Item
								onClick={async () => {
									const newCountry: CountryRow = {
										id: Math.random(),
										country: "Country",
										frequency: "1",

										builtIn: false,

										defaultRaces: true,
										races: [...infoState.defaultRaces],

										defaultColleges: true,
										colleges: [...infoState.defaultColleges],
										fractionSkipCollege: "0.98",

										defaultNames: false,
										names: {
											first: [],
											last: [],
										},
									};

									addCountry(newCountry);
								}}
							>
								Custom
							</Dropdown.Item>
							{defaultCountriesAvailable.map(row => (
								<Dropdown.Item
									key={row.id}
									onClick={() => {
										addCountry({ ...row });
									}}
								>
									{row.country}
								</Dropdown.Item>
							))}
						</Dropdown.Menu>
					</Dropdown>
					<Dropdown>
						<Dropdown.Toggle
							className="btn-light-bordered btn-light-bordered-group-right"
							variant="foo"
							id="dropdown-countries-reset"
						>
							Reset
						</Dropdown.Toggle>

						<Dropdown.Menu>
							<Dropdown.Item
								onClick={async () => {
									setInfoState(
										formatPlayerBioInfoState(
											await toWorker("main", "getDefaultInjuries"),
											defaults,
										),
									);
								}}
							>
								Default
							</Dropdown.Item>
							<Dropdown.Item
								onClick={() => {
									setInfoState(data => ({
										...data,
										countries: [],
									}));
								}}
							>
								Clear
							</Dropdown.Item>
						</Dropdown.Menu>
					</Dropdown>
				</div>
				<div className="btn-group">
					<ImportButton
						defaults={defaults}
						setErrorMessage={setImportErrorMessage}
						setInfoState={setInfoState}
					/>
					<ExportButton infoState={infoState} />
				</div>
			</div>

			{importErrorMessage ? (
				<div className="text-danger mt-3">{importErrorMessage}</div>
			) : null}
		</>
	);
};

export const CountriesEditor = ({
	defaults,
	defaultsState,
	handleCancel,
	handleChange,
	handleSave,
	onSetDefault,
	infoState,
	setInfoState,
	setPageInfo,
}: {
	defaults: Defaults;
	defaultsState: PlayerBioInfoState;
	handleCancel: any;
	handleChange: any;
	handleSave: any;
	onSetDefault: (type: "colleges" | "names" | "races", i: number) => void;
	infoState: PlayerBioInfoState;
	setInfoState: SetInfoState;
	setPageInfo: (pageInfo: PageInfo) => void;
}) => {
	return (
		<>
			<Modal.Body>
				<p>
					By default, leagues can have players from any of the built-in
					countries. Each built-in country comes with built-in names and races,
					and they all share the same default colleges list. Here you can edit
					any of that, or add custom countries.
				</p>
				<p>
					The probability of a new player being from a certain country being
					selected is its "frequency" value divided by the sum of all
					frequencies. Names, colleges, and races work the same way.
				</p>

				<div className="mb-3">
					<button
						className="btn btn-secondary mr-2"
						onClick={() => {
							setPageInfo({
								name: "races",
								index: "default",
							});
						}}
					>
						Edit default races
					</button>
					<button
						className="btn btn-secondary"
						onClick={() => {
							setPageInfo({
								name: "colleges",
								index: "default",
							});
						}}
					>
						Edit default colleges
					</button>
				</div>

				<Controls
					defaults={defaults}
					defaultsState={defaultsState}
					position="top"
					infoState={infoState}
					setInfoState={setInfoState}
				/>

				{infoState.countries.length > 0 ? (
					<form onSubmit={handleSave} className="my-3">
						<input type="submit" className="d-none" />
						<div
							className="form-row font-weight-bold"
							style={{ marginRight: 22 }}
						>
							<div className="col-4">Country</div>
							<div className="col-2">Frequency</div>
							<div className="col-2">Names</div>
							<div className="col-2">Colleges</div>
							<div className="col-2">Races</div>
						</div>
						{infoState.countries.map((country, i) => (
							<div key={country.id} className="d-flex">
								<div className="form-row mt-2 flex-grow-1" key={i}>
									<div className="col-4">
										<input
											type="text"
											className="form-control"
											value={country.country}
											onChange={handleChange("name", i)}
										/>
									</div>
									<div className="col-2">
										<input
											type="text"
											className={classNames("form-control", {
												"is-invalid": isInvalidNumber(
													parseFloat(country.frequency),
												),
											})}
											value={country.frequency}
											onChange={handleChange("frequency", i)}
										/>
									</div>
									{(["names", "colleges", "races"] as const).map(key => {
										const onClickCustom = () => {
											setPageInfo({
												name: key,
												index: i,
											});
										};

										if (key === "names" && !country.builtIn) {
											// Non-built in countries have no default names

											return (
												<div className="col-2" key={key}>
													<button
														className="btn btn-secondary"
														onClick={onClickCustom}
													>
														Custom
													</button>
												</div>
											);
										}

										return (
											<div className="col-2" key={key}>
												<Dropdown>
													<Dropdown.Toggle
														variant="secondary"
														id={`dropdown-${key}-${country.id}`}
													>
														{country[
															`default${helpers.upperCaseFirstLetter(
																key,
															)}` as const
														]
															? "Default"
															: "Custom"}
													</Dropdown.Toggle>

													<Dropdown.Menu>
														<Dropdown.Item
															onClick={() => {
																onSetDefault(key, i);
															}}
														>
															Default
														</Dropdown.Item>
														<Dropdown.Item onClick={onClickCustom}>
															Custom
														</Dropdown.Item>
													</Dropdown.Menu>
												</Dropdown>
											</div>
										);
									})}
								</div>
								<button
									className="text-danger btn btn-link pl-2 pr-0 border-0"
									onClick={() => {
										setInfoState(data => ({
											...data,
											countries: data.countries.filter(row => row !== country),
										}));
									}}
									style={{ fontSize: 20 }}
									title="Delete"
									type="button"
								>
									<span className="glyphicon glyphicon-remove" />
								</button>
							</div>
						))}
					</form>
				) : (
					<div className="mt-3 text-danger">
						You must define at least one country.
					</div>
				)}

				{infoState.countries.length > 0 ? (
					<Controls
						defaults={defaults}
						defaultsState={defaultsState}
						position="bottom"
						infoState={infoState}
						setInfoState={setInfoState}
					/>
				) : null}
			</Modal.Body>
			<Modal.Footer>
				<button className="btn btn-secondary" onClick={handleCancel}>
					Cancel
				</button>
				<button
					className="btn btn-primary"
					onClick={handleSave}
					disabled={infoState.countries.length === 0}
				>
					Save
				</button>
			</Modal.Footer>
		</>
	);
};