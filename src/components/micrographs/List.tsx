import { Menu, Transition } from "@headlessui/react";
import { PortableMicrograph } from "../../../src-tauri/bindings/PortableMicrograph";
import { MoreVertical, Trash, Trash2, FileUp } from "lucide-react";
import { Fragment } from "react";
import clsx from "clsx";
import { useAutoAnimate } from "@formkit/auto-animate/react"
import { Button } from "../ui/button";
import { useQuery } from "@tanstack/react-query";
import { invoke } from "@tauri-apps/api/tauri";
import { LinearProgress, } from "@mui/material";

type ListProps = {
    micrographs: PortableMicrograph[]
    onDelete: (uuid: string) => void,
    onExport: (uuid: string) => void,
}

const List = ({ micrographs, onDelete, onExport }: ListProps) => {
    const [animationParent] = useAutoAnimate();
    return (
        <div>
            <ul role="list" className="divide-y divide-gray-700" ref={animationParent}>
                {micrographs.map((micrograph) => (
                    <ListItem key={micrograph.uuid} micrograph={micrograph} onDelete={onDelete} onExport={onExport} />
                ))}
            </ul>
        </div>
    )
}

const statuses = {
    Done: 'text-green-700 bg-green-50 ring-green-600/20',
    Pending: 'text-gray-600 bg-gray-50 ring-gray-500/10',
    Segmented: 'text-yellow-800 bg-yellow-50 ring-yellow-600/20',
    Imported: 'text-blue-800 bg-blue-50 ring-blue-600/20',
    Error: 'text-red-800 bg-red-50 ring-red-600/20',
}

type ListItemProps = {
    micrograph: PortableMicrograph
    onDelete: (uuid: string) => void
    onExport: (uuid: string) => void
}
const ListItem = ({ micrograph, onDelete, onExport }: ListItemProps) => {
    const [animationParent] = useAutoAnimate();
    const { data } = useQuery({
        queryKey: ["processor_status", micrograph.uuid],
        queryFn: () => getProcessorStatus(micrograph.uuid),
        refetchInterval: 200
    });

    return (
        <li key={micrograph.uuid} className="flex items-center justify-between gap-x-6 py-5">
            <div className="min-w-0 w-full max-w-lg space-y-2" ref={animationParent}>
                <div className="flex items-start gap-x-3">
                    <p className="text-sm font-semibold leading-6 text-white">{micrograph.name}</p>
                    <p
                        className={clsx(
                            statuses[micrograph.status],
                            'rounded-md whitespace-nowrap mt-0.5 px-1.5 py-0.5 text-xs font-medium ring-1 ring-inset'
                        )}
                    >
                        {micrograph.status}
                    </p>
                </div>
                {micrograph.status != "Done" && micrograph.status != "Error" && (
                    <div className="flex items-center">
                        <LinearProgress variant={data?.total_jobs ? "determinate" : "indeterminate"} value={data?.total_jobs ? ((data.completed_jobs / data.total_jobs) * 100) : undefined} className="w-full mr-2" />
                        {data?.total_jobs && <span className="tabular-nums">{Math.floor((data?.completed_jobs / data?.total_jobs) * 100)}%</span>}
                    </div>
                )}
            </div>
            <div className="flex flex-none items-center gap-x-4">
                <Button disabled={micrograph.status == "Error" || micrograph.status == "Pending"}
                    onClick={() => openViewer(micrograph.uuid)}
                >Open in Viewer</Button>
                <Menu as="div" className="relative flex-none">
                    <Menu.Button className="-m-2.5 block p-2.5 text-gray-500 hover:text-white">
                        <span className="sr-only">Open options</span>
                        <MoreVertical className="h-5 w-5" aria-hidden="true" />
                    </Menu.Button>
                    <Transition
                        as={Fragment}
                        enter="transition ease-out duration-100"
                        enterFrom="transform opacity-0 scale-95"
                        enterTo="transform opacity-100 scale-100"
                        leave="transition ease-in duration-75"
                        leaveFrom="transform opacity-100 scale-100"
                        leaveTo="transform opacity-0 scale-95"
                    >
                        <Menu.Items className="absolute right-0 z-10 mt-2 w-32 origin-top-right rounded-md bg-white py-2 shadow-lg ring-1 ring-gray-900/5 focus:outline-none">
                            {/*<Menu.Item>
                                {({ active }) => (
                                    <a
                                        href="#"
                                        className={clsx(
                                            active ? 'bg-gray-100' : '',
                                            'block px-3 py-1 text-sm leading-6 text-gray-900'
                                        )}
                                    >
                                        Edit<span className="sr-only">, {micrograph.name}</span>
                                    </a>
                                )}
                            </Menu.Item>
                            <Menu.Item>
                                {({ active }) => (
                                    <a
                                        href="#"
                                        className={clsx(
                                            active ? 'bg-gray-100' : '',
                                            'block px-3 py-1 text-sm leading-6 text-gray-900'
                                        )}
                                    >
                                        Move<span className="sr-only">, {micrograph.name}</span>
                                    </a>
                                )}
                            </Menu.Item>
                            */}
                            <Menu.Item>
                                {({ active }) => (
                                    <a
                                        onClick={() => onDelete(micrograph.uuid)}
                                        className={clsx(
                                            active ? 'bg-gray-100' : '',
                                            'block px-3 py-1 text-sm leading-6 text-gray-900 cursor-pointer'
                                        )}
                                    >
                                        <Trash2 className="h-4 w-4 inline mr-2" />Delete<span className="sr-only">, {micrograph.name}</span>
                                    </a>
                                )}
                            </Menu.Item>
                            <Menu.Item>
                                {({ active }) => (
                                    <a
                                        onClick={() => onExport(micrograph.uuid)}
                                        className={clsx(
                                            active ? 'bg-gray-100' : '',
                                            'block px-3 py-1 text-sm leading-6 text-gray-900 cursor-pointer'
                                        )}
                                    >
                                        <FileUp className="h-4 w-4 inline mr-2" />Export CSV<span className="sr-only">, {micrograph.name}</span>
                                    </a>
                                )}
                            </Menu.Item>
                        </Menu.Items>
                    </Transition>
                </Menu>
            </div>
        </li>
    );
}

export default List;

type ProcessorStatus = {
    status: string
    total_jobs: number,
    completed_jobs: number,
}

const getProcessorStatus = async (micrographId: string) => {
    return await invoke<ProcessorStatus>("get_processor_status", { micrographId });
}

const openViewer = async (micrographId: string) => {
    const { WebviewWindow, getCurrent } = await import("@tauri-apps/api/window")
    // get the current window label
    const project_id = getCurrent().label;
    // generate random id for the new window
    const id = Math.random().toString(36).substring(7);
    const webview = new WebviewWindow(`viewer:${id}`, {
        url: `/viewer/?project=${project_id}&micrograph=${micrographId}`,
        title: `Viewer`,
    });
}